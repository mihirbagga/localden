/**
 * aiInspection.js — Client-side visual inspection & anomaly detection
 * Compares pre-rental (checkin) and post-rental (checkout) photos using HTML5 Canvas pixel diffing.
 */

export async function analyzeInspectionPhotos(preImageUrl, postImageUrl) {
  return new Promise((resolve, reject) => {
    const imgPre = new Image()
    const imgPost = new Image()
    imgPre.crossOrigin = 'anonymous'
    imgPost.crossOrigin = 'anonymous'

    let preLoaded = false
    let postLoaded = false

    const checkBothLoaded = () => {
      if (preLoaded && postLoaded) {
        try {
          const result = runPixelDiff(imgPre, imgPost)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      }
    }

    imgPre.onload = () => { preLoaded = true; checkBothLoaded() }
    imgPost.onload = () => { postLoaded = true; checkBothLoaded() }

    imgPre.onerror = () => reject(new Error('Failed to load check-in photo'))
    imgPost.onerror = () => reject(new Error('Failed to load check-out photo'))

    imgPre.src = preImageUrl
    imgPost.src = postImageUrl
  })
}

function runPixelDiff(imgPre, imgPost) {
  const width = 400
  const height = 300

  const canvasPre = document.createElement('canvas')
  const canvasPost = document.createElement('canvas')
  const canvasDiff = document.createElement('canvas')

  canvasPre.width = width
  canvasPre.height = height
  canvasPost.width = width
  canvasPost.height = height
  canvasDiff.width = width
  canvasDiff.height = height

  const ctxPre = canvasPre.getContext('2d')
  const ctxPost = canvasPost.getContext('2d')
  const ctxDiff = canvasDiff.getContext('2d')

  ctxPre.drawImage(imgPre, 0, 0, width, height)
  ctxPost.drawImage(imgPost, 0, 0, width, height)

  const dataPre = ctxPre.getImageData(0, 0, width, height).data
  const dataPost = ctxPost.getImageData(0, 0, width, height).data
  const diffImageData = ctxDiff.createImageData(width, height)
  const dataDiff = diffImageData.data

  let totalDiffPixels = 0
  let significantDiffCount = 0
  const gridAnomalies = {}

  for (let i = 0; i < dataPre.length; i += 4) {
    const rDiff = Math.abs(dataPre[i] - dataPost[i])
    const gDiff = Math.abs(dataPre[i + 1] - dataPost[i + 1])
    const bDiff = Math.abs(dataPre[i + 2] - dataPost[i + 2])
    const totalPixelDelta = (rDiff + gDiff + bDiff) / 3

    if (totalPixelDelta > 30) {
      totalDiffPixels++
      if (totalPixelDelta > 65) {
        significantDiffCount++

        // Record grid sector
        const pixelIdx = i / 4
        const x = pixelIdx % width
        const y = Math.floor(pixelIdx / width)
        const sectorX = Math.floor((x / width) * 3)
        const sectorY = Math.floor((y / height) * 3)
        const key = `${sectorX},${sectorY}`
        gridAnomalies[key] = (gridAnomalies[key] || 0) + 1
      }

      // Heatmap color highlight (Cyan / Red shift for anomalies)
      dataDiff[i] = 255     // R
      dataDiff[i + 1] = 46  // G
      dataDiff[i + 2] = 109 // B
      dataDiff[i + 3] = Math.min(255, totalPixelDelta * 2.5) // A
    } else {
      // Normal background
      dataDiff[i] = 10
      dataDiff[i + 1] = 20
      dataDiff[i + 2] = 30
      dataDiff[i + 3] = 40
    }
  }

  ctxDiff.putImageData(diffImageData, 0, 0)
  const diffDataUrl = canvasDiff.toDataURL('image/png')

  const totalPixels = width * height
  const diffRatio = totalDiffPixels / totalPixels
  const sigRatio = significantDiffCount / totalPixels

  // Visual integrity calculation
  let integrityScore = Math.round(100 - (sigRatio * 500) - (diffRatio * 80))
  integrityScore = Math.max(15, Math.min(100, integrityScore))

  let status = 'Clean / Matching'
  let badgeColor = 'emerald'
  let summary = 'No significant visual discrepancies detected between check-in and check-out photos.'

  if (integrityScore < 75) {
    status = 'Minor Visual Differences'
    badgeColor = 'amber'
    summary = 'Minor surface changes detected (lighting shift, dust, or light scuffs).'
  }
  if (integrityScore < 50) {
    status = 'Potential Physical Damage'
    badgeColor = 'rose'
    summary = 'Noticeable physical differences or deep scratches detected in specific sectors.'
  }

  // Format sector names
  const sectorNames = {
    '0,0': 'Top-Left',
    '1,0': 'Top-Center',
    '2,0': 'Top-Right',
    '0,1': 'Mid-Left',
    '1,1': 'Center',
    '2,1': 'Mid-Right',
    '0,2': 'Bottom-Left',
    '1,2': 'Bottom-Center',
    '2,2': 'Bottom-Right',
  }

  const flaggedSectors = Object.entries(gridAnomalies)
    .filter(([_, count]) => count > 50)
    .map(([key, count]) => ({
      region: sectorNames[key] || key,
      intensity: count > 300 ? 'High' : 'Moderate',
    }))

  return {
    integrityScore,
    status,
    badgeColor,
    summary,
    flaggedSectors,
    diffDataUrl,
    timestamp: new Date().toISOString(),
  }
}
