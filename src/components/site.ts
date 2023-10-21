import PhotoSwipeLightbox from 'https://esm.sh/photoswipe@5.4.2/dist/photoswipe-lightbox.esm.js';

declare global {
  // deno-lint-ignore no-var
  var gtag: (event: string, name: string, opts: Record<string, any>) => void
}
function sendGa(name: string, type: string) {
  if (!('gtag' in globalThis)) return;
  globalThis.gtag('event', name, { type: type });
}

function showAllTag(event: Event) {
  event.preventDefault();
  const target = event.target as HTMLAnchorElement;
  target.parentElement!.style.display = 'none';

  const allTags = document.querySelector('#all-tags') as HTMLDivElement;
  allTags && (allTags.style.display = 'inline');
}

globalThis.addEventListener('load', () => {
  const link = document.querySelector('#show-all-tags');
  link && link.addEventListener('click', showAllTag);

  document.querySelectorAll('a.image-swipe').forEach((el) => {
    const img = el.querySelector('img');
    if (img) {
      el.setAttribute('data-pswp-width', img.naturalWidth.toString());
      el.setAttribute('data-pswp-height', img.naturalHeight.toString());
      new PhotoSwipeLightbox({
        gallery: `#${el.id}`,
        pswpModule: () => import('https://esm.sh/photoswipe@5.4.2/dist/photoswipe.esm.js'),
      }).init();
    }
  })

  document.querySelectorAll('.mameyose-event-link').forEach(el => {
    el.addEventListener("click", () => sendGa('click_mameyose_event', 'ad'))
  });
});
