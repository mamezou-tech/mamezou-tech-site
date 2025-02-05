interface Props {
  url: string;
  ja: string;
  en?: string;
  zh?: string;
}

export default ({ url, ja, en, zh }: Props) => {
  if (!en && !zh) return null;

  return (
    <div className="lang-switch__wrapper flex items-center text-sm space-x-2">
      {url === ja ? (
        <span className="text-gray-400">日本語</span>
      ) : (
        <a className="hover:underline lang-switch__link-ja" href={ja}>
          日本語
        </a>
      )}

      {(en || zh) && <span className="text-gray-500">|</span>}

      {en &&
        (url === en ? (
          <span className="text-gray-400">English</span>
        ) : (
          <a className="hover:underline lang-switch__link-en" href={en}>
            English
          </a>
        ))}

      {en && zh && <span className="text-gray-500">|</span>}

      {zh &&
        (url === zh ? (
          <span className="text-gray-400">中国语</span>
        ) : (
          <a className="hover:underline lang-switch__link-zh" href={zh}>
            中国语
          </a>
        ))}
    </div>
  );
};
