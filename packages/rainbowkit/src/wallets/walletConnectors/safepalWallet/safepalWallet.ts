/* eslint-disable sort-keys-fix/sort-keys-fix */
import type { InjectedConnectorOptions } from '@wagmi/core/connectors/injected';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { Chain } from '../../../components/RainbowKitProvider/RainbowKitChainContext';
import { getWalletConnectUri } from '../../../utils/getWalletConnectUri';
import { InstructionStepName, Wallet } from '../../Wallet';
import { getWalletConnectConnector } from '../../getWalletConnectConnector';
import type {
  WalletConnectConnectorOptions,
  WalletConnectLegacyConnectorOptions,
} from '../../getWalletConnectConnector';

declare global {
  interface Window {
    safepalProvider: Window['ethereum'];
  }
}

export interface SafepalWalletLegacyOptions {
  projectId?: string;
  chains: Chain[];
  walletConnectVersion: '1';
  walletConnectOptions?: WalletConnectLegacyConnectorOptions;
}

export interface SafepalWalletOptions {
  projectId: string;
  chains: Chain[];
  walletConnectVersion?: '2';
  walletConnectOptions?: WalletConnectConnectorOptions;
}

function getSafepalWalletInjectedProvider(): Window['ethereum'] {
  const isSafePalWallet = (ethereum: NonNullable<Window['ethereum']> | any) => {
    // Identify if SafePal Wallet injected provider is present.
    const safepalWallet = !!ethereum.isSafePal;

    return safepalWallet;
  };

  const injectedProviderExist =
    typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  // No injected providers exist.
  if (!injectedProviderExist) {
    return;
  }

  // SafePal Wallet injected provider is available in the global scope.
  // There are cases that some cases injected providers can replace window.ethereum
  // without updating the ethereum.providers array. To prevent issues where
  // the TW connector does not recognize the provider when TW extension is installed,
  // we begin our checks by relying on TW's global object.
  if (window['safepalProvider']) {
    return window['safepalProvider'];
  }

  // SafePal Wallet was injected into window.ethereum.
  if (isSafePalWallet(window.ethereum!)) {
    return window.ethereum;
  }

  // SafePal Wallet provider might be replaced by another
  // injected provider, check the providers array.
  if (window.ethereum?.providers) {
    // ethereum.providers array is a non-standard way to
    // preserve multiple injected providers. Eventually, EIP-5749
    // will become a living standard and we will have to update this.
    return window.ethereum.providers.find(isSafePalWallet);
  }
}

export const safepalWallet = ({
  chains,
  projectId,
  walletConnectOptions,
  walletConnectVersion = '2',
  ...options
}: (SafepalWalletLegacyOptions | SafepalWalletOptions) &
  InjectedConnectorOptions): Wallet => {
  const isSafePalWalletInjected = Boolean(getSafepalWalletInjectedProvider());
  const shouldUseWalletConnect = !isSafePalWalletInjected;

  return {
    id: 'safepal',
    name: 'SafePal Wallet',
    iconUrl: async () => (await import('./safepalWallet.svg')).default,
    // Note that we never resolve `installed` to `false` because the
    // SafePal Wallet provider falls back to other connection methods if
    // the injected connector isn't available
    installed: isSafePalWalletInjected || undefined,
    iconAccent: '#3375BB',
    iconBackground: '#fff',
    downloadUrls: {
      android:
        'https://play.google.com/store/apps/details?id=io.safepal.wallet&referrer=utm_source%3Drainbowkit%26utm_medium%3Ddisplay%26utm_campaign%3Ddownload',
      ios: 'https://apps.apple.com/app/apple-store/id1548297139?pt=122504219&ct=rainbowkit&mt=8',
      mobile: 'https://www.safepal.com/en/download',
      qrCode: 'https://www.safepal.com/en/download',
      chrome:
        'https://chrome.google.com/webstore/detail/safepal-extension-wallet/lgmpcpglpngdoalbgeoldeajfclnhafa',
      browserExtension: 'https://www.safepal.com/download?product=2',
    },
    createConnector: () => {
      const getUriMobile = async () => {
        const uri = await getWalletConnectUri(connector, walletConnectVersion);

        return `safepalwallet://wc?uri=${encodeURIComponent(uri)}`;
      };

      const getUriQR = async () => {
        const uri = await getWalletConnectUri(connector, walletConnectVersion);

        return uri;
      };

      const connector = shouldUseWalletConnect
        ? getWalletConnectConnector({
            projectId,
            chains,
            version: walletConnectVersion,
            options: walletConnectOptions,
          })
        : new InjectedConnector({
            chains,
            options: {
              getProvider: getSafepalWalletInjectedProvider,
              ...options,
            },
          });

      const mobileConnector = {
        getUri: shouldUseWalletConnect ? getUriMobile : undefined,
      };

      let qrConnector = undefined;

      if (shouldUseWalletConnect) {
        qrConnector = {
          getUri: getUriQR,
          instructions: {
            learnMoreUrl: 'https://safepal.com/',
            steps: [
              {
                description:
                  'Put SafePal Wallet on your home screen for faster access to your wallet.',
                step: 'install' as InstructionStepName,
                title: 'Open the SafePal Wallet app',
              },
              {
                description: 'Create a new wallet or import an existing one.',
                step: 'create' as InstructionStepName,
                title: 'Create or Import a Wallet',
              },
              {
                description:
                  'Choose New Connection, then scan the QR code and confirm the prompt to connect.',
                step: 'scan' as InstructionStepName,
                title: 'Tap WalletConnect in Settings',
              },
            ],
          },
        };
      }

      const extensionConnector = {
        instructions: {
          learnMoreUrl: 'https://www.safepal.com/download?product=2',
          steps: [
            {
              description:
                'Click at the top right of your browser and pin SafePal Wallet for easy access.',
              step: 'install' as InstructionStepName,
              title: 'Install the SafePal Wallet extension',
            },
            {
              description: 'Create a new wallet or import an existing one.',
              step: 'create' as InstructionStepName,
              title: 'Create or Import a wallet',
            },
            {
              description:
                'Once you set up SafePal Wallet, click below to refresh the browser and load up the extension.',
              step: 'refresh' as InstructionStepName,
              title: 'Refresh your browser',
            },
          ],
        },
      };

      return {
        connector,
        mobile: mobileConnector,
        qrCode: qrConnector,
        extension: extensionConnector,
      };
    },
  };
};