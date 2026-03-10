import { NextRequest, NextResponse } from 'next/server';

const BYBIT_BASE_URL = 'https://api.bybit.com';

interface BybitTickerResponse {
  retCode: number;
  retMsg?: string;
  result?: {
    list?: Array<{ lastPrice?: string }>;
  };
}

interface BybitInstrument {
  status: string;
  baseCoin: string;
  symbol: string;
  deliveryTime: string | number;
  bid1Price?: string;
  ask1Price?: string;
  lastPrice?: string;
  markPrice?: string;
  markIv?: string;
  volume24h?: string;
  optionsType: 'Call' | 'Put';
}

interface BybitInstrumentsResponse {
  retCode: number;
  retMsg?: string;
  result?: {
    list?: BybitInstrument[];
  };
}

export async function GET(request: NextRequest) {
  const baseCoin = request.nextUrl.searchParams.get('baseCoin') === 'ETH' ? 'ETH' : 'BTC';
  const tickerSymbol = `${baseCoin}USDT`;

  try {
    const [tickerResponse, instrumentsResponse] = await Promise.all([
      fetch(`${BYBIT_BASE_URL}/v5/market/tickers?category=linear&symbol=${tickerSymbol}`, {
        cache: 'no-store',
      }),
      fetch(`${BYBIT_BASE_URL}/v5/market/instruments-info?category=option&limit=500`, {
        cache: 'no-store',
      }),
    ]);

    if (!tickerResponse.ok || !instrumentsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch option-chain market data' },
        { status: 502 }
      );
    }

    const tickerData = (await tickerResponse.json()) as BybitTickerResponse;
    const instrumentsData = (await instrumentsResponse.json()) as BybitInstrumentsResponse;

    if (tickerData.retCode !== 0 || instrumentsData.retCode !== 0) {
      return NextResponse.json(
        {
          error:
            instrumentsData.retMsg ||
            tickerData.retMsg ||
            'Bybit API error',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        underlyingPrice: Number.parseFloat(tickerData.result?.list?.[0]?.lastPrice || '0') || 0,
        instruments:
          (instrumentsData.result?.list || []).filter(
            (instrument) => instrument.status === 'Trading' && instrument.baseCoin === baseCoin
          ),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch option chain',
      },
      { status: 500 }
    );
  }
}
