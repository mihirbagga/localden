const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const imgPath = path.join(process.cwd(), 'public/hero/ps5.png');
const imgBase64 = fs.readFileSync(imgPath).toString('base64');
const dataUrl = `data:image/png;base64,${imgBase64}`;

const svg = `<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="500" fill="#0e1017"/>
  <image href="${dataUrl}" x="50" y="50" width="400" height="400"/>
</svg>`;

const resvg = new Resvg(svg);
fs.writeFileSync('scratch/test_base64.png', resvg.render().asPng());
console.log('Success! Base64 embedded image rendered.');
