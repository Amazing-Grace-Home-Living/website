import { signaturePlacement } from './signature-layout.js';

const $ = id => document.getElementById(id);
const drawing = $('drawing');
const preview = $('signature-preview');
const drawContext = drawing.getContext('2d');
const previewContext = preview.getContext('2d');
let hasDrawing = false;
let drawingActive = false;
let pdf = null;
let loadedFile = null;

function updatePreview() {
  previewContext.clearRect(0, 0, preview.width, preview.height);
  if ($('style').value === 'draw') {
    previewContext.drawImage(drawing, 0, 0);
  } else {
    const fonts = { script: '"Brush Script MT", cursive', handwritten: '"Comic Sans MS", cursive', serif: 'Georgia, serif' };
    previewContext.fillStyle = '#141414';
    previewContext.font = `64px ${fonts[$('style').value]}`;
    previewContext.textBaseline = 'middle';
    previewContext.fillText($('typed-name').value.trim(), 15, 80, 570);
  }
}
function pointerPosition(event) {
  const box = drawing.getBoundingClientRect();
  return { x: (event.clientX - box.left) * drawing.width / box.width, y: (event.clientY - box.top) * drawing.height / box.height };
}
drawing.addEventListener('pointerdown', event => {
  drawingActive = true;
  drawing.setPointerCapture(event.pointerId);
  const point = pointerPosition(event);
  drawContext.beginPath();
  drawContext.moveTo(point.x, point.y);
  drawContext.lineTo(point.x + 0.1, point.y);
  drawContext.lineWidth = 3;
  drawContext.lineCap = 'round';
  drawContext.strokeStyle = '#141414';
  drawContext.stroke();
  hasDrawing = true;
  updatePreview();
});
drawing.addEventListener('pointermove', event => {
  if (!drawingActive) return;
  const point = pointerPosition(event);
  drawContext.lineTo(point.x, point.y);
  drawContext.stroke();
  updatePreview();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) drawing.addEventListener(name, () => { drawingActive = false; });
$('clear-drawing').addEventListener('click', () => { drawContext.clearRect(0, 0, drawing.width, drawing.height); hasDrawing = false; updatePreview(); });
$('style').addEventListener('change', () => {
  const draw = $('style').value === 'draw';
  $('draw-controls').hidden = !draw;
  $('typed-controls').hidden = draw;
  updatePreview();
});
$('typed-name').addEventListener('input', updatePreview);
$('pdf').addEventListener('change', async () => {
  pdf = null;
  loadedFile = null;
  const file = $('pdf').files[0];
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) { $('file-info').textContent = 'File exceeds the 25 MB limit.'; return; }
  try {
    const bytes = await file.arrayBuffer();
    const loaded = await PDFLib.PDFDocument.load(bytes);
    if ($('pdf').files[0] !== file) return;
    pdf = loaded;
    loadedFile = file;
    $('page').max = String(pdf.getPageCount());
    $('file-info').textContent = `${pdf.getPageCount()} page(s) loaded locally.`;
  } catch {
    $('file-info').textContent = 'Unable to open this PDF. It may be invalid or encrypted.';
  }
});
function updateGuide() {
  const left = Number($('left').value), bottom = Number($('bottom').value), width = Number($('width').value);
  const guide = $('position-guide');
  guide.style.left = `${left}%`;
  guide.style.bottom = `${bottom}%`;
  guide.style.width = `${width}%`;
  guide.style.height = `${width * 160 / 600 * 8.5 / 11}%`;
}
for (const id of ['left', 'bottom', 'width']) $(id).addEventListener('input', updateGuide);
updateGuide();
$('signature-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('save').disabled = true;
  $('pdf').disabled = true;
  try {
    if (!pdf || !loadedFile) throw new Error('Choose a valid PDF first.');
    if ($('style').value === 'draw' ? !hasDrawing : !$('typed-name').value.trim()) throw new Error('Create a signature first.');
    const pageNumber = Number($('page').value);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.getPageCount()) throw new Error('Choose an existing page.');
    const copy = await PDFLib.PDFDocument.load(await loadedFile.arrayBuffer());
    const page = copy.getPage(pageNumber - 1);
    const crop = page.getCropBox(), media = page.getMediaBox();
    if (page.getRotation().angle % 360 !== 0 || ['x', 'y', 'width', 'height'].some(key => crop[key] !== media[key]) || media.x !== 0 || media.y !== 0) {
      throw new Error('Rotated or cropped pages are not supported. Use an unrotated, uncropped page.');
    }
    const image = await copy.embedPng(preview.toDataURL('image/png'));
    const placement = signaturePlacement({ pageWidth: page.getWidth(), pageHeight: page.getHeight(),
      left: Number($('left').value), bottom: Number($('bottom').value), width: Number($('width').value),
      imageWidth: image.width, imageHeight: image.height });
    page.drawImage(image, placement);
    const bytes = await copy.save();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${loadedFile.name.replace(/\.pdf$/i, '')}-signed.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    $('status').textContent = 'Download requested. Open the signed copy and verify the placement.';
  } catch (error) {
    $('status').textContent = error.message || 'Could not create the signed PDF.';
  } finally {
    $('save').disabled = false;
    $('pdf').disabled = false;
  }
});
