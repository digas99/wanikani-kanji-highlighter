import WanikaniAPIManager from 'wanikani-api-manager'

let client: WanikaniAPIManager | null = null

export function getWKManager(apiKey?: string, proxyServer?: string) {
  if (!client && apiKey && proxyServer) {
    client = new WanikaniAPIManager({ apiKey, proxy: proxyServer });
  }
  return client;
}