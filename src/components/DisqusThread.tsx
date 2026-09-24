import { useEffect, useRef } from 'react';

const DISQUS_SHORTNAME = 'parksgmbai';
const PAGE_URL = 'https://parksg-seven.vercel.app';
const PAGE_IDENTIFIER = 'home';

declare global {
  interface Window {
    DISQUS?: any;
    disqus_config?: () => void;
  }
}

export default function DisqusThread() {
  const loaded = useRef(false);

  useEffect(() => {
    window.disqus_config = function (this: any) {
      this.page.url = PAGE_URL;
      this.page.identifier = PAGE_IDENTIFIER;
    };

    if (loaded.current) {
      if (window.DISQUS) {
        window.DISQUS.reset({ reload: true, config: window.disqus_config });
      }
      return;
    }

    loaded.current = true;
    const script = document.createElement('script');
    script.src = `https://${DISQUS_SHORTNAME}.disqus.com/embed.js`;
    script.setAttribute('data-timestamp', String(Date.now()));
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <section className="px-5 py-8 bg-white border-t border-slate-100">
      <p className="text-sm text-slate-600 mb-4">
        Tell us what worked for you and what did not.
      </p>
      <div id="disqus_thread" />
    </section>
  );
}
