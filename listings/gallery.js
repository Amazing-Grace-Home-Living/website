const links = [...document.querySelectorAll('[data-photo]')];
const viewer = document.getElementById('photo-viewer');
const photo = document.getElementById('full-photo');
const caption = document.getElementById('photo-caption');
let index = 0, opener, activeLinks = [], city = '';
function show(next) {
 index = (next + activeLinks.length) % activeLinks.length;
 photo.src = activeLinks[index].href;
 photo.alt = activeLinks[index].querySelector('img').alt;
 caption.textContent = `${city} · ${index + 1} of ${activeLinks.length}`;
}
for (const link of links) link.addEventListener('click', event => {
 event.preventDefault(); opener = link;
 const section = link.closest('.gallery-section'); city = section.dataset.city;
 activeLinks = [...section.querySelectorAll('[data-photo]')];
 show(Number(link.dataset.photo)); viewer.showModal();
});
document.getElementById('close-photo').addEventListener('click', () => viewer.close());
document.getElementById('previous-photo').addEventListener('click', () => show(index - 1));
document.getElementById('next-photo').addEventListener('click', () => show(index + 1));
viewer.addEventListener('keydown', event => {
 if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
 if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
});
viewer.addEventListener('close', () => opener?.focus());
