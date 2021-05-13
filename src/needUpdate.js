// @flow
import semver from 'semver';
import isNil from 'lodash.isnil';

import { getVersionInfo } from './versionInfo';
import * as providers from './providers';
import { IVersionAndStoreUrl } from './providers/types';
import {
  getLatestVersion,
  defaultOption as defaultOptionForLatestVersion,
} from './getLatestVersion';

const DELIMITER = '.';

function getVersionWithDepth(version: string, depth: number): string {
  let versionArray = null;
  if (version.indexOf(DELIMITER) === -1) {
    versionArray = [version];
  } else {
    versionArray = version
      .split(DELIMITER)
      .slice(0, Math.min(depth, version.length));
  }
  return [...versionArray, ...[0, 0, 0].slice(0, 3 - versionArray.length)].join(
    DELIMITER
  );
}

export type NeedUpdateOption = {
  currentVersion?: string,
  latestVersion?: string,
  depth?: number,
  ignoreErrors?: boolean,
};

export type NeedUpdateResult = {
  isNeeded: boolean,
  storeUrl: string,
  currentVersion: string,
  latestVersion: string,
  latestReleaseDate: number,
};

export default async function needUpdate(
  needUpdateOption: ?NeedUpdateOption = {}
): Promise<NeedUpdateResult> {
  const option = {
    currentVersion: null,
    latestVersion: null,
    depth: Infinity,
    ignoreErrors: true,
    ...defaultOptionForLatestVersion,
    ...needUpdateOption,
  };

  try {
    if (isNil(option.currentVersion)) {
      option.currentVersion = getVersionInfo().getCurrentVersion();
    }

    let latestVersion;
    let providerStoreUrl = '';
    let latestReleaseDate;

    if (isNil(option.latestVersion)) {
      if (option.provider.getVersion) {
        const {
          version,
          storeUrl,
          releaseDate,
        }: IVersionAndStoreUrl = await option.provider.getVersion(option);
        latestVersion = version;
        providerStoreUrl = storeUrl;
        latestReleaseDate = releaseDate;
      }

      if (providers[option.provider]) {
        const { version, storeUrl, releaseDate }: IVersionAndStoreUrl = await providers[
          option.provider
        ].getVersion(option);
        latestVersion = version;
        providerStoreUrl = storeUrl;
        latestReleaseDate = releaseDate;
      }

      option.latestVersion = latestVersion || (await getLatestVersion(option));
      option.latestReleaseDate = latestReleaseDate || undefined;
    }

    return checkIfUpdateNeeded(
      option.currentVersion,
      option.latestVersion,
      option.latestReleaseDate,
      option,
      providerStoreUrl
    );
  } catch (e) {
    if (option.ignoreErrors) {
      console.warn(e); // eslint-disable-line no-console
    } else {
      throw e;
    }
  }
}

function checkIfUpdateNeeded(
  currentVersion,
  latestVersion,
  latestReleaseDate,
  option,
  providerStoreUrl
) {
  const currentVersionWithDepth = getVersionWithDepth(
    currentVersion,
    option.depth
  );
  const latestVersionWithDepth = getVersionWithDepth(
    latestVersion,
    option.depth
  );

  const response = {
    isNeeded: semver.gt(latestVersionWithDepth, currentVersionWithDepth),
    storeUrl: providerStoreUrl,
    currentVersion,
    latestVersion,
    latestReleaseDate,
  };

  return Promise.resolve(response);
}
