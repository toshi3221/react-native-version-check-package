// @flow
import { getVersionInfo } from '../versionInfo';

import { IProvider, IVersionAndStoreUrl } from './types';

export type PlayStoreGetVersionOption = {
  packageName?: string,
  fetchOptions?: any,
  ignoreErrors?: boolean,
};

export interface IPlayStoreProvider extends IProvider {
  getVersion: PlayStoreGetVersionOption => Promise<IVersionAndStoreUrl>;
}

function error(text: string) {
  return {
    message:
      "Parse Error. Your app's play store page doesn't seem to have latest app version info.",
    text,
  };
}

class PlayStoreProvider implements IProvider {
  getVersion(option: PlayStoreGetVersionOption): Promise<IVersionAndStoreUrl> {
    const opt = option || {};
    try {
      if (!opt.packageName) {
        opt.packageName = getVersionInfo().getPackageName();
      }

      const storeUrl = `https://play.google.com/store/apps/details?id=${opt.packageName}&hl=en`;

      return fetch(storeUrl, opt.fetchOptions)
        .then(res => res.text())
        .then(text => {
          const match = text.match(/Current Version.+?>([\d.]+)<\/span>/);
          if (match) {
            const latestVersion = match[1].trim();

            const updatedMatch = text.match(/Updated.+?>([ ,0-9a-zA-Z]+)<\/span>/);
            const releaseDate = Date.parse(updatedMatch && updatedMatch[1]);

            return Promise.resolve({ version: latestVersion, storeUrl, releaseDate });
          }

          return Promise.reject(error(text));
        });
    } catch (e) {
      if (opt.ignoreErrors) {
        console.warn(e); // eslint-disable-line no-console
      } else {
        throw e;
      }
    }
  }
}

export default new PlayStoreProvider();
