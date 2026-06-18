import { Configuration, PublicClientApplication, LogLevel } from "@azure/msal-browser";

const clientId = (import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined) ?? "";
const tenantId = (import.meta.env.VITE_AZURE_TENANT_ID as string | undefined) ?? "common";

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: () => {},
      logLevel: LogLevel.Error,
      piiLoggingEnabled: false,
    },
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL eagerly so the provider is ready before first use.
export const msalReady = msalInstance.initialize();

export function isMsalConfigured(): boolean {
  return Boolean(clientId);
}