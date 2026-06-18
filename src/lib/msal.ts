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
  scopes: ["openid", "profile", "email"],
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL eagerly so the provider is ready before first use,
// then process any redirect response (returns from loginRedirect).
export const msalReady = msalInstance.initialize().then(async () => {
  try {
    const result = await msalInstance.handleRedirectPromise({
      navigateToLoginRequestUrl: false,
    });
    // eslint-disable-next-line no-console
    console.log("[msal] init complete", {
      origin: window.location.origin,
      redirectUri: msalConfig.auth.redirectUri,
      clientId,
      tenantId,
      hasResult: Boolean(result),
      resultAccount: result?.account?.username,
      accountsInCache: msalInstance.getAllAccounts().map((a) => a.username),
    });
    if (result?.account) {
      msalInstance.setActiveAccount(result.account);
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts[0]) msalInstance.setActiveAccount(accounts[0]);
    }
  } catch (err) {
    console.error("[msal] handleRedirectPromise failed", err);
  }
});

export function isMsalConfigured(): boolean {
  return Boolean(clientId);
}

export function setActiveMsalAccount() {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
  if (account) msalInstance.setActiveAccount(account);
  return account;
}