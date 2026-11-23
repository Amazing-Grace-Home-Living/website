export function signaturePlacement({ pageWidth, pageHeight, left, bottom, width, imageWidth, imageHeight }) {
  const values = [pageWidth, pageHeight, left, bottom, width, imageWidth, imageHeight];
  if (!values.every(Number.isFinite) || pageWidth <= 0 || pageHeight <= 0 || imageWidth <= 0 || imageHeight <= 0
      || left < 0 || bottom < 0 || width <= 0 || left + width > 100 || bottom >= 100) {
    throw new Error('Choose a position and width that fit on the page.');
  }
  const result = {
    x: pageWidth * left / 100,
    y: pageHeight * bottom / 100,
    width: pageWidth * width / 100,
    height: pageWidth * width / 100 * imageHeight / imageWidth
  };
  if (result.y + result.height > pageHeight) throw new Error('The signature is too tall for this position.');
  return result;
}
