import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const BTC_USD_KEY = 'rate_btc_usd';
const USD_BRL_KEY = 'rate_usd_brl'; // 1 USD = X BRL
const LAST_UPDATED_KEY = 'rates_last_updated';

// --- Função para buscar cotações da API externa ---
async function fetchExternalRates(): Promise<{ btcUsd: number; usdToBrlRate: number } | null> {
  try {
    const coingeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,brl`;
    // const apiKey = process.env.COINGECKO_API_KEY; // Se estiver usando uma chave paga
    // const headers = apiKey ? { 'X-CG-Pro-API-Key': apiKey } : {};
    
    const response = await fetch(coingeckoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // ...headers // Descomente se usar API Key
      },
      next: { revalidate: 0 }, // Força busca nova, sem cache do Next.js para esta chamada específica
    });

    if (!response.ok) {
      console.error(`Error fetching from CoinGecko: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("CoinGecko Error Body:", errorBody);
      return null;
    }

    const data = await response.json();

    const btcUsd = data.bitcoin?.usd;
    const btcBrl = data.bitcoin?.brl;

    if (typeof btcUsd !== 'number' || typeof btcBrl !== 'number' || btcUsd === 0) {
      console.error('Invalid data structure or zero BTC/USD rate from CoinGecko:', data);
      return null;
    }

    const usdToBrlRate = btcBrl / btcUsd; // Calculando 1 USD = X BRL

    return { btcUsd, usdToBrlRate };
  } catch (error) {
    console.error('Exception fetching external rates:', error);
    return null;
  }
}

// --- Função auxiliar para atualizar dados no KV ---
async function updateRatesInKV() {
  const rates = await fetchExternalRates();
  if (rates && rates.btcUsd > 0 && rates.usdToBrlRate > 0) { // Validação mínima
    const timestamp = new Date().toISOString();
    await kv.set(BTC_USD_KEY, rates.btcUsd);
    await kv.set(USD_BRL_KEY, rates.usdToBrlRate);
    await kv.set(LAST_UPDATED_KEY, timestamp);
    console.log(`Rates updated in KV: BTC/USD=${rates.btcUsd}, USD/BRL=${rates.usdToBrlRate}, Time=${timestamp}`);
    return { 
      btcUsd: rates.btcUsd, 
      usdToBrlRate: rates.usdToBrlRate, 
      timestamp 
    };
  }
  console.warn("Failed to fetch valid external rates. KV not updated.");
  return null;
}

// --- Handler GET: Para o frontend buscar as cotações ---
export async function GET() {
  try {
    let btcUsd = await kv.get<number>(BTC_USD_KEY);
    let usdToBrlRate = await kv.get<number>(USD_BRL_KEY);
    let lastUpdated = await kv.get<string>(LAST_UPDATED_KEY);
    let isFromKV = true;

    // Se faltar algum dado no KV, tentar uma atualização imediata
    if (btcUsd === null || usdToBrlRate === null || lastUpdated === null) {
      console.warn("Rates not found or incomplete in KV. Attempting to fetch and set now for GET request.");
      const updatedKvData = await updateRatesInKV();
      if (updatedKvData) {
        btcUsd = updatedKvData.btcUsd;
        usdToBrlRate = updatedKvData.usdToBrlRate;
        lastUpdated = updatedKvData.timestamp;
        isFromKV = false; // Indica que os dados foram recém-buscados
      } else {
        // Se mesmo a atualização falhar, retornar erro
        return NextResponse.json({ error: 'Failed to retrieve rates. KV is empty and live fetch failed.' }, { status: 503 }); // 503 Service Unavailable
      }
    }
    
    // Calcular o preço do BTC em BRL para a estrutura AppData
    const btcBrl = btcUsd * usdToBrlRate;

    return NextResponse.json({
      currentPrice: {
        usd: btcUsd,
        brl: btcBrl, // Preço do BTC em BRL
        usdToBrlExchangeRate: usdToBrlRate, // Taxa de 1 USD = X BRL
        timestamp: lastUpdated,
      },
      isUsingCache: isFromKV, // Verdadeiro se veio do KV, falso se foi recém-buscado no GET
    });

  } catch (error) {
    console.error('Error in GET /api/rates:', error);
    return NextResponse.json({ error: 'Internal server error while fetching rates.' }, { status: 500 });
  }
}

// --- Handler POST: Para o Cron Job chamar (protegido) ---
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("Unauthorized POST attempt to /api/rates");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updated = await updateRatesInKV();
    if (updated) {
      return NextResponse.json({ message: 'Rates updated successfully in KV by CRON.', data: updated });
    }
    // Se updateRatesInKV falhar, ele já loga. Retornar erro para o Cron Job.
    return NextResponse.json({ error: 'Failed to fetch external rates during CRON execution.' }, { status: 502 }); // Bad Gateway
  } catch (error) {
    console.error('Error in POST /api/rates (CRON execution):', error);
    return NextResponse.json({ error: 'Internal server error during CRON rates update.' }, { status: 500 });
  }
} 