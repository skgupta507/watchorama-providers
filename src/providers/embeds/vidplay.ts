import { flags } from '@/main/targets';
import { makeEmbed } from '@/providers/base';
import { StreamRes, encodeId, getFutoken } from '@/providers/sources/vidsrc/common';

import { Caption, getCaptionTypeFromUrl, labelToLanguageCode } from '../captions';

export const vidplayScraper = makeEmbed({
  id: 'vidplay',
  name: 'Vidplay',
  rank: 355,
  async scrape(ctx) {
    const key = await encodeId(ctx.url.split('/e/')[1].split('?')[0]);
    const data = await getFutoken(key, ctx.url);

    let subtitles;
    if (ctx.url.includes('sub.info=')) {
      const subtitleLink = ctx.url.split('?sub.info=')[1].split('&')[0];
      const subtitlesFetch = await fetch(decodeURIComponent(subtitleLink));
      subtitles = await subtitlesFetch.json();
    }

    const response = await ctx.proxiedFetcher<StreamRes>(
      `https://vidplay.site/mediainfo/${data}?${ctx.url.split('?')[1]}&autostart=true`,
      {
        headers: {
          Referer: ctx.url,
        },
        query: {
          v: Date.now().toString(),
        },
      },
    );

    const result = response.result;

    if (!result && typeof result !== 'object') {
      throw new Error('video source not found');
    }

    const captions: Caption[] = [];
    subtitles.forEach((track: { file: string; label: string }) => {
      const type = getCaptionTypeFromUrl(track.file);
      if (!type) return;
      const language = labelToLanguageCode(track.label);
      if (!language) return;
      captions.push({
        language,
        hasCorsRestrictions: false,
        type,
        url: track.file,
      });
    });

    return {
      stream: {
        type: 'hls',
        playlist: result.sources[0].file,
        flags: [flags.NO_CORS],
        captions,
      },
    };
  },
});
