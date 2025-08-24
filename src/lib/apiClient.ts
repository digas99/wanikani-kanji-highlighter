import WanikaniAPIManager from 'wanikani-api-manager'

let client: WanikaniAPIManager | null = null

export function getWKManager(apiKey?: string, proxyServer?: string) {
  if (!client) {
    client = new WanikaniAPIManager(apiKey, proxyServer);
  }
  return client;
}