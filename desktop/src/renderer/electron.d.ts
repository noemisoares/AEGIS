export {};

declare global {
  interface Window {
    electronAPI?: {
      showNotification: (title: string, body: string) => Promise<boolean>;
      getApiUrl: () => Promise<string | null>;
      platform: string;
    };
  }
}
