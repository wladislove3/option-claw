import { NextResponse } from 'next/server';
import crypto from 'crypto';

const BYBIT_BASE_URL = 'https://api.bybit.com';

export async function GET() {
  const apiKey = process.env.BYBIT_API_KEY?.trim();
  const apiSecret = process.env.BYBIT_API_SECRET?.trim();

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Missing BYBIT_API_KEY or BYBIT_API_SECRET' },
      { status: 500 }
    );
  }

  try {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    const params = 'category=option';
    
    // Signature: timestamp + api_key + recv_window + query_string (no ? or &)
    const signVal = timestamp + apiKey + recvWindow + params;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signVal)
      .digest('hex');

    const url = `${BYBIT_BASE_URL}/v5/position/list?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    
    if (!text) {
      return NextResponse.json({ error: 'Empty response from Bybit' }, { status: response.status });
    }

    const data = JSON.parse(text);
    
    if (data.retCode !== 0) {
      return NextResponse.json(
        { error: data.retMsg || 'Bybit API error' },
        { status: response.status }
      );
    }

    return NextResponse.json(data.result?.list || []);
  } catch (error) {
    console.error('Bybit API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch positions from Bybit' },
      { status: 500 }
    );
  }
}
