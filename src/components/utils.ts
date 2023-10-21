
export function sendGa(name: string) {

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
});