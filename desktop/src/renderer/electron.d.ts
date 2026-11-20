export {};

declare global {
  interface Window {
    electronAPI?: {
      showNotification: (title: string, body: string) => Promise<boolean>;
      platform: string;
    };
  }
}

