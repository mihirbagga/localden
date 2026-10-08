/**
 * Pure JavaScript QR Code Generator (Zero external dependencies)
 * Generates standards-compliant QR Code Matrix and SVG/DataURLs.
 * Based on QR Code Model 2 specification.
 */

// QR Code error correction levels
const EC_L = 1
const EC_M = 0
const EC_Q = 3
const EC_H = 2

// Polynomial math helpers
const EXP_TABLE = new Uint8Array(256)
const LOG_TABLE = new Uint8Array(256)
for (let i = 0, x = 1; i < 256; i++) {
  EXP_TABLE[i] = x
  LOG_TABLE[x] = i
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0)
}

function glog(n) {
  if (n < 1) throw new Error(`glog(${n})`)
  return LOG_TABLE[n]
}

function gexp(n) {
  while (n < 0) n += 255
  while (n >= 256) n -= 255
  return EXP_TABLE[n]
}

function polyMul(p1, p2) {
  const res = new Uint8Array(p1.length + p2.length - 1)
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] ^= gexp(glog(p1[i]) + glog(p2[j]))
    }
  }
  return res
}

function getGeneratorPoly(numEc) {
  let g = new Uint8Array([1])
  for (let i = 0; i < numEc; i++) {
    g = polyMul(g, new Uint8Array([1, gexp(i)]))
  }
  return g
}

function calcEcBytes(dataBytes, numEc) {
  const gen = getGeneratorPoly(numEc)
  const padded = new Uint8Array(dataBytes.length + numEc)
  padded.set(dataBytes)
  for (let i = 0; i < dataBytes.length; i++) {
    const coef = padded[i]
    if (coef !== 0) {
      const logCoef = glog(coef)
      for (let j = 0; j < gen.length; j++) {
        padded[i + j] ^= gexp(logCoef + glog(gen[j]))
      }
    }
  }
  return padded.slice(dataBytes.length)
}

// QR Table: [version, numTotalBytes, numDataBytes, numEcBytes]
const QR_SPECS = [
  null,
  [1, 26, 19, 7],
  [2, 44, 34, 10],
  [3, 70, 55, 15],
  [4, 100, 80, 20],
  [5, 134, 108, 26],
  [6, 172, 136, 36],
  [7, 196, 156, 40],
  [8, 242, 194, 48],
  [9, 292, 232, 60],
  [10, 346, 274, 72],
]

function chooseVersion(dataLen) {
  for (let v = 1; v < QR_SPECS.length; v++) {
    const maxData = QR_SPECS[v][2] - 3 // byte mode header + count + terminator
    if (dataLen <= maxData) return QR_SPECS[v]
  }
  return QR_SPECS[10]
}

function encodeData(text, spec) {
  const enc = new TextEncoder()
  const bytes = enc.encode(text)
  const [, totalBytes, dataCap, ecCount] = spec

  const bits = []
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1)
  }

  // Byte mode indicator: 0100
  pushBits(0b0100, 4)
  // Character count: 8 bits for versions 1-9
  pushBits(bytes.length, spec[0] <= 9 ? 8 : 16)
  // Data bytes
  for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8)
  // Terminator
  pushBits(0, Math.min(4, dataCap * 8 - bits.length))
  // Align to byte
  while (bits.length % 8 !== 0) bits.push(0)
  // Pad bytes
  const padPatterns = [0xec, 0x11]
  let padIdx = 0
  while (bits.length < dataCap * 8) {
    pushBits(padPatterns[padIdx % 2], 8)
    padIdx++
  }

  const dataArr = new Uint8Array(dataCap)
  for (let i = 0; i < dataCap; i++) {
    let b = 0
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j]
    dataArr[i] = b
  }

  const ecArr = calcEcBytes(dataArr, ecCount)
  const finalBytes = new Uint8Array(totalBytes)
  finalBytes.set(dataArr, 0)
  finalBytes.set(ecArr, dataCap)
  return finalBytes
}

function getAlignmentPatternPositions(ver) {
  if (ver === 1) return []
  if (ver === 2) return [6, 18]
  if (ver === 3) return [6, 22]
  if (ver === 4) return [6, 26]
  if (ver === 5) return [6, 30]
  if (ver === 6) return [6, 34]
  if (ver === 7) return [6, 22, 38]
  if (ver === 8) return [6, 24, 42]
  if (ver === 9) return [6, 26, 46]
  if (ver === 10) return [6, 28, 52]
  return []
}

export function generateQrMatrix(text) {
  const spec = chooseVersion(new TextEncoder().encode(text).length)
  const ver = spec[0]
  const size = ver * 4 + 17
  const matrix = Array.from({ length: size }, () => Array(size).fill(null))

  function fillRect(x, y, w, h, val) {
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        matrix[r][c] = val
      }
    }
  }

  // Finder patterns
  function drawFinder(ox, oy) {
    fillRect(ox, oy, 7, 7, 1)
    fillRect(ox + 1, oy + 1, 5, 5, 0)
    fillRect(ox + 2, oy + 2, 3, 3, 1)
  }
  drawFinder(0, 0)
  drawFinder(size - 7, 0)
  drawFinder(0, size - 7)

  // Separators
  fillRect(7, 0, 1, 8, 0)
  fillRect(0, 7, 8, 1, 0)
  fillRect(size - 8, 0, 1, 8, 0)
  fillRect(size - 8, 7, 8, 1, 0)
  fillRect(0, size - 8, 8, 1, 0)
  fillRect(7, size - 8, 1, 8, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0
    if (matrix[6][i] === null) matrix[6][i] = v
    if (matrix[i][6] === null) matrix[i][6] = v
  }

  // Alignment patterns
  const alignCoords = getAlignmentPatternPositions(ver)
  for (const r of alignCoords) {
    for (const c of alignCoords) {
      if (matrix[r][c] !== null) continue
      fillRect(c - 2, r - 2, 5, 5, 1)
      fillRect(c - 1, r - 1, 3, 3, 0)
      matrix[r][c] = 1
    }
  }

  // Dark module
  matrix[4 * ver + 9][8] = 1

  // Format info placeholders
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0
    if (matrix[i][8] === null) matrix[i][8] = 0
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = 0
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = 0
  }

  // Place data bits
  const rawBytes = encodeData(text, spec)
  const bitArr = []
  for (let i = 0; i < rawBytes.length; i++) {
    for (let j = 7; j >= 0; j--) bitArr.push((rawBytes[i] >> j) & 1)
  }

  let bitIdx = 0
  let upward = true
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--
    const cols = [right, right - 1]
    const rowList = []
    for (let r = 0; r < size; r++) rowList.push(upward ? size - 1 - r : r)
    for (const r of rowList) {
      for (const c of cols) {
        if (matrix[r][c] === null) {
          const bit = bitIdx < bitArr.length ? bitArr[bitIdx++] : 0
          // Apply mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0 ? 1 : 0
          matrix[r][c] = bit ^ mask
        }
      }
    }
    upward = !upward
  }

  // Draw format bits (Mask 0, Error Correction L: 0b111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0]
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i]
  matrix[8][7] = formatBits[6]
  matrix[8][8] = formatBits[7]
  matrix[7][8] = formatBits[8]
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i]

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i]
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i]

  return matrix
}

export function generateQrSvg(text, { size = 260, margin = 3, color = '#000000', bgColor = '#ffffff' } = {}) {
  try {
    const matrix = generateQrMatrix(text)
    const n = matrix.length
    const totalDim = n + margin * 2

    let rects = ''
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c] === 1) {
          rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${color}" />`
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalDim} ${totalDim}" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="${bgColor}" rx="12" />
      ${rects}
    </svg>`
  } catch (err) {
    console.warn('generateQrSvg error:', err?.message)
    return null
  }
}

export function generateQrDataUri(text, options = {}) {
  const svg = generateQrSvg(text, options)
  if (!svg) return null
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function buildUpiPayload({ upiId = '', payeeName = 'LocalDen', amount = null, note = 'LocalDen Booking' }) {
  const cleanId = (upiId || '').trim()
  if (!cleanId) return ''
  let uri = `upi://pay?pa=${encodeURIComponent(cleanId)}&pn=${encodeURIComponent(payeeName)}&cu=INR`
  if (amount && Number(amount) > 0) {
    uri += `&am=${encodeURIComponent(String(amount))}`
  }
  if (note) {
    uri += `&tn=${encodeURIComponent(note)}`
  }
  return uri
}

export function getOnlineQrUrl(data, size = 300) {
  if (!data) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(data)}`
}

